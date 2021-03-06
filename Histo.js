// Clairvoyant.js 1 - D histogram class ---------------------------------------------------------------- 
function Histo(nBins, min, max) {
    'use strict';
    var i;

    this.nBins = nBins;
    this.min = min;
    this.max = max;

    // set up array of histogram bins
    this.binSize = (max - min) / nBins;
    this.bins = [];
    for (i = 0; i < nBins; i++) {
        this.bins.push({lo: this.min  +  i * this.binSize, weight: 0});
    }
    this.bins.push({lo: max, weight: 0});

    // function definitions: --------------------------------------------------------------------- 

    // write all contents of histogram as  <lo edge>  :  <weight> 
    this.dump = function () {
        var i;

        for (i = 0; i < this.bins.length; i++) {
            document.write(this.bins[i].lo + ' : ' + this.bins[i].weight + '</br>');
        }

        return 0;
    };


    // increment the bin in which  <value>  falls by  <amount> ;
    // increments this bin by 1 if no value provided for  <amount> .
    this.increment = function (value, amnt) {
        var amount, i, index;
        index = 0;

        amount = typeof amnt !== 'undefined' ? amnt : 1;

        try {
            if (value  <  this.min || value >= this.max) {
                throw ('Value falls outside of histogram range.');
            }
        } catch (err) {
            return;
        }

        for (i = 0; i < this.bins.length; i++) {
            if (this.bins[i].lo <= value) {
                index = i;
            }
        }

        this.bins[index].weight += amount;

        return 0;
    };


    // integrate from  <min>  to  <max> ;
    // returns integral of whole histo if no args provided;
    // if bound is in the middle of a bin, treats weight as distributed flat across the bin
    this.integrate = function (min, max) {
        var i, maxBin, minBin, total;
        maxBin = -1;
        minBin = -1;
        total = 0;

        // return integral of whole histo if no arguments provided
        if (arguments.length === 0) {
            for (i = 0; i < this.bins.length; i++) {
                total  += this.bins[i].weight;
            }
            return total;
        }

        // otherwise integrate from min to max:
        if (arguments.length === 2) {

            try {
                if (min  <  this.min || max  >  this.max) {
                    throw ('Integration bounds OOR');
                }
            } catch (err) {
                return;
            }


            for (i = 0; i < this.bins.length; i++) {
                if (this.bins[i].lo  <=  min) {
                    minBin = i;
                }
                if (this.bins[i].lo  <  max) {
                    maxBin = i;
                }
            }

            total = 0;
            // integrate all bins in range except for fractionally included ones:
            for (i = minBin + 1; i < maxBin; i++) {
                total  += this.bins[i].weight;
            }
            // treat weight as distributed evenly across a bin for fractionally included first bin
            total  += this.bins[minBin].weight * (this.bins[minBin + 1].lo - min) / (this.bins[minBin + 1].lo - this.bins[minBin].lo);

            // similarly for the last bin
            if (minBin !== maxBin) {
                total  += this.bins[maxBin].weight * (max - this.bins[maxBin].lo) / (this.bins[maxBin + 1].lo - this.bins[maxBin].lo);
            }

            return total;

        }

    };


    // normalize the histogram to  < factor > ;
    //  < factor >  set to 1 if not provided
    this.normalize = function (fac) {
        var factor, i, total;

        factor = typeof fac !== 'undefined' ? fac : 1;

        total = this.integrate();

        for (i = 0; i < this.bins.length; i++) {
            this.bins[i].weight = factor * this.bins[i].weight / total;
        }

        return 0;
    };


    // returns a new Histo formed by adding this Histo * <sc1> + <otherHisto> * <sc2>
    //  <scale>  default = 1
    this.add = function (otherHisto, sc1, sc2) {
        var j, scale1, scale2, sumHisto;

        if (this.nBins !==  otherHisto.nBins || this.min !==  otherHisto.min || this.max !==  otherHisto.max) {
            throw ('Can\'t add histrograms with different binning.');
        }

        sumHisto = new Histo(this.nBins, this.min, this.max);

        scale1 = typeof sc1 !== 'undefined' ? sc1 : 1;
        scale2 = typeof sc2 !== 'undefined' ? sc2 : 1;

        for (j = 0; j < this.bins.length; j++) {
            sumHisto.increment(this.bins[j].lo, scale1 * this.bins[j].weight);
            sumHisto.increment(otherHisto.bins[j].lo, scale2 * otherHisto.bins[j].weight);
        }

        return sumHisto;
    };


    // returns the mean of the distribution.    bin weight is attributed to the low edge of the bin
    this.getMean = function () {
        var i, totalWeight, weightedSum;

        totalWeight = this.integrate();
        weightedSum = 0;
        for (i = 0; i < this.bins.length - 1; i++) {
            weightedSum  += this.bins[i].lo * this.bins[i].weight;
        }

        return weightedSum / totalWeight;
    };


    // returns the variance of the distribution.
    this.getVariance = function () {
        var i, mean, meanSquare, totalWeight, weightedSquares;

        totalWeight = this.integrate();
        weightedSquares = 0;
        for (i = 0; i < this.bins.length - 1; i++) {
            weightedSquares  += Math.pow(this.bins[i].lo, 2) * this.bins[i].weight;
        }
        meanSquare = weightedSquares / totalWeight;

        mean = this.getMean();

        return meanSquare - mean * mean;
    };


    // returns the cumulative distribution function of this (normalized) histogram
    this.getCDF = function () {
        var cloneHist, i;

        cloneHist = this;
        cloneHist.normalize();

        for (i = 1; i < cloneHist.bins.length - 1; i++) {
            cloneHist.bins[i].weight += cloneHist.bins[i - 1].weight;
        }

        return cloneHist;

    };


    // perform a KS match between this histo and  < target >  histo
    this.ksTest = function (target) {
        var CDF1, CDF2, delta, i, KSstat, weight1, weight2;


        try {
            if ((this.nBins !==  target.nBins)    ||    (this.min !==  target.min)    || (this.max !==  target.max)) {
                throw ('histos must have same min, max and divisions for KS test, abandoning test...');
            }
        } catch (err) {
            return;
        }

        CDF1 = new Histo(10, 0, 10);
        CDF1 = this.getCDF();
        CDF2 = new Histo(10, 0, 10);
        CDF2 = target.getCDF();

        weight1 = this.integrate();
        weight2 = target.integrate();

        delta = 0;
        for (i = 0; i < this.bins.length; i++) {
            if (Math.abs(CDF1.bins[i].weight - CDF2.bins[i].weight) > delta) {
                delta = Math.abs(CDF1.bins[i].weight - CDF2.bins[i].weight);
            }
        }

        KSstat = Math.sqrt(weight1 * weight2 / (weight1 + weight2)) * delta;
        return kolmogorov(KSstat);
    };


    this.sample = function (nSamples, source) {
        var nP, p, pull, x;

        x = [];
        p = [];
        for (nP = 0; nP < source.params.length; nP++) {
            p[nP] = source.params[nP];
        }
        for (pull = 0; pull < nSamples; pull++) {
            x[0] = Math.random() * (this.max - this.min)  +  this.min;
            this.increment(x[0], source.evaluate(x, p));
        }

        return 0;
    };

    //draw this histo
    //if ymin = ymax, tries to cover complete range of bin heights.
    this.draw = function (canvas, ymin, ymax, title, xtitle, ytitle, plotstyle) {

        var color, fill, i, lineWidth, plot, binHeight, binWidth, opacity, yMin, yMax;

        if (ymin === ymax) {
            yMin = 0;
            yMax = 0;
            for (i = 0; i < this.nBins; i++) {
                if (this.bins[i].weight > yMax) {
                    yMax = this.bins[i].weight;
                }
            }
            yMax = 1.1 * yMax;
        } else {
            yMin = ymin;
            yMax = ymax;
        }

        if (typeof plotstyle !== 'undefined') {
            plot = new Plot(canvas, this.min, this.max, yMin, yMax, title, xtitle, ytitle, plotstyle);
            color = plotstyle.color;
            fill = plotstyle.fill;
            opacity = plotstyle.opacity;
            lineWidth = plotstyle.lineWidth;
        } else {
            plot = new Plot(canvas, this.min, this.max, yMin, yMax, title, xtitle, ytitle);
            color = 'black';
            fill = 'white';
            opacity = 1;
            lineWidth = 2;
        }

        //allow axis suppression for overlaying multiple drawings
        if ((typeof plotstyle !== 'undefined' && !plotstyle.suppress) || typeof plotstyle === 'undefined') {
            plot.draw();
        }

        plot.context.strokeStyle = color;
        plot.context.globalAlpha = opacity;
        plot.context.fillStyle = fill;
        if (fill === 'rightCrosshatch') {
            plot.context.fillStyle = rightCrosshatch(lineWidth, color);
        }
        if (fill === 'leftCrosshatch') {
            plot.context.fillStyle = leftCrosshatch(lineWidth, color);
        }
        if (fill === 'dots') {
            plot.context.fillStyle = dots(lineWidth, color);
        }
        plot.context.lineWidth = lineWidth;
        
        binWidth = (plot.canvas.width - (1 + plot.marginScaleY) * plot.marginSize) / this.nBins;
        for (i = 0; i < this.nBins; i++) {
        
            //-----functional plotstyle--------------------------
            if (typeof plotstyle !== 'undefined') {
                if (typeof plotstyle.fill !== 'string') {
                    plot.context.fillStyle = plotstyle.fill(i);
                }
                if (typeof plotstyle.opacity !== 'number') {
                    plot.context.globalAlpha = plotstyle.opacity(i);
                }                
            }
            //---------------------------------------------------
        
            if (this.bins[i].weight < ymin) {
                binHeight = 0;
            } else if (this.bins[i].weight > yMax) {
                binHeight = plot.canvas.height - 2 * plot.marginSize;
            } else {
                binHeight = (plot.canvas.height - 2 * plot.marginSize) * (this.bins[i].weight - yMin) / (yMax - yMin);
            }
            //set opacity for fill:
            plot.context.globalAlpha = opacity;
            plot.context.fillRect(plot.marginScaleY * plot.marginSize + i * binWidth, plot.canvas.height - plot.marginSize - binHeight, binWidth, binHeight);
            //opacity for bin borders is always 1 (for now?)
            plot.context.globalAlpha = 1;
            plot.context.strokeRect(plot.marginScaleY * plot.marginSize + i * binWidth, plot.canvas.height - plot.marginSize - binHeight, binWidth, binHeight);
        }
    };

    //returns the x-axis boundary below which <CL> fraction of the sample is found.
    //linearly interpolates between bin boundaries.
    this.lowerTail = function (CL) {
        var boundary, fraction, lowTail, i, tail, total;
        
        if (CL < 0 || CL > 1 || CL === 'undefined' || typeof CL !== 'number') {
            alert('upperTail requires an argument on [0, 1]');
            return;
        }
        
        total = this.integrate();
        lowTail = CL * total;
        tail = 0;
        i = 0;
        
        while (tail + this.bins[i].weight < lowTail) {
            tail += this.bins[i].weight;
            i++;
        }
        
        fraction = (lowTail - tail) / this.bins[i].weight;
        boundary = i / this.nBins * (this.max - this.min) + fraction * this.binSize;
        
        return boundary;
    };
    
    //returns the x-axis boundary above which <CL> fraction of the sample is found.
    //linearly interpolates between bin boundaries.
    this.upperTail = function (CL) {
        var boundary, fraction, highTail, i, tail, total;
        
        if (CL < 0 || CL > 1 || CL === 'undefined' || typeof CL !== 'number') {
            alert('upperTail requires an argument on [0, 1]');
            return;
        }
        
        total = this.integrate();
        highTail = CL * total;
        tail = 0;
        i = this.nBins-1;
        
        while (tail + this.bins[i].weight < highTail) {
            tail += this.bins[i].weight;
            i--;
        }
        
        fraction = (highTail - tail) / this.bins[i].weight;
        boundary = (i+1) / this.nBins * (this.max - this.min) - fraction * this.binSize;
        
        return boundary;
    };

}
